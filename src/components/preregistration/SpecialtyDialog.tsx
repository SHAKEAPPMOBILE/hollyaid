import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { specialtyCategories } from "@/components/preregistration/constants";

type Props = {
  selectedSpecialties: string[];
  otherSpecialty: string;
  showOtherSpecialty: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSpecialty: (specialty: string, checked: boolean) => void;
  onOtherSpecialtyChange: (value: string) => void;
  onClearAll: () => void;
};

export function SpecialtyDialog(props: Props) {
  const {
    selectedSpecialties,
    otherSpecialty,
    showOtherSpecialty,
    open,
    onOpenChange,
    onToggleSpecialty,
    onOtherSpecialtyChange,
    onClearAll,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="border-primary/30">
          Select Specialties
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Your Specialties</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-4">
            {specialtyCategories.map((category) => (
              <div key={category.type}>
                <h4 className="text-md font-semibold text-primary/90 mb-3 border-b border-primary/10 pb-2">
                  {category.type}
                </h4>
                <div className="grid grid-cols-1">
                  {category.subtypes.map((sub) => (
                    <label
                      key={sub}
                      className="flex items-start gap-2 text-sm text-primary p-2 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSpecialties.includes(sub)}
                        onCheckedChange={(checked) => onToggleSpecialty(sub, Boolean(checked))}
                        className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <span className="whitespace-nowrap leading-snug">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showOtherSpecialty && (
            <div className="mt-4 animate-fade-in border-t border-primary/10 pt-4">
              <Label htmlFor="otherSpecialtyModal" className="text-sm font-medium text-primary">
                Please specify your other specialty
              </Label>
              <Input
                id="otherSpecialtyModal"
                className="mt-1 w-full border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                value={otherSpecialty}
                onChange={(e) => onOtherSpecialtyChange(e.target.value)}
                placeholder="Enter your custom specialty"
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onClearAll}
          >
            Clear All
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
